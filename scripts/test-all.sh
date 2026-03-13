#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if MongoDB is running
check_mongodb() {
    print_status "Checking MongoDB connection..."
    if ! command -v mongosh &> /dev/null; then
        if ! command -v mongo &> /dev/null; then
            print_error "MongoDB client not found. Please install MongoDB."
            return 1
        fi
        MONGO_CLIENT="mongo"
    else
        MONGO_CLIENT="mongosh"
    fi

    if ! $MONGO_CLIENT --eval "db.stats()" --quiet > /dev/null 2>&1; then
        print_error "MongoDB is not running. Please start MongoDB before running tests."
        print_status "Try: brew services start mongodb/brew/mongodb-community"
        print_status "Or: docker run -d -p 27017:27017 mongo:6.0"
        return 1
    fi

    print_status "✅ MongoDB is running"
    return 0
}

# Function to run backend tests
run_backend_tests() {
    print_status "🧪 Running backend tests..."
    cd server

    if [ ! -d "node_modules" ]; then
        print_status "Installing backend dependencies..."
        npm install
    fi

    # Create logs directory if it doesn't exist
    mkdir -p logs

    # Run tests
    print_status "Executing backend test suite..."
    npm test

    BACKEND_EXIT_CODE=$?
    cd ..
    return $BACKEND_EXIT_CODE
}

# Function to run frontend tests
run_frontend_tests() {
    print_status "⚛️  Running frontend tests..."
    cd client

    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install
    fi

    # Run tests
    print_status "Executing frontend test suite..."
    npm run test:run

    FRONTEND_EXIT_CODE=$?
    cd ..
    return $FRONTEND_EXIT_CODE
}

# Function to generate coverage reports
generate_coverage() {
    print_status "📊 Generating coverage reports..."

    # Backend coverage
    print_status "Generating backend coverage..."
    cd server
    npm test > /dev/null 2>&1
    if [ -d "coverage" ]; then
        print_status "✅ Backend coverage generated: server/coverage/index.html"
    fi
    cd ..

    # Frontend coverage
    print_status "Generating frontend coverage..."
    cd client
    npm run test:coverage > /dev/null 2>&1
    if [ -d "coverage" ]; then
        print_status "✅ Frontend coverage generated: client/coverage/index.html"
    fi
    cd ..
}

# Function to run security audit
run_security_audit() {
    print_status "🔒 Running security audit..."

    # Backend audit
    print_status "Auditing backend dependencies..."
    cd server
    npm audit --audit-level moderate
    BACKEND_AUDIT_EXIT=$?
    cd ..

    # Frontend audit
    print_status "Auditing frontend dependencies..."
    cd client
    npm audit --audit-level moderate
    FRONTEND_AUDIT_EXIT=$?
    cd ..

    if [ $BACKEND_AUDIT_EXIT -eq 0 ] && [ $FRONTEND_AUDIT_EXIT -eq 0 ]; then
        print_status "✅ Security audit passed"
        return 0
    else
        print_warning "⚠️ Security vulnerabilities found"
        return 1
    fi
}

# Function to clean up test artifacts
cleanup() {
    print_status "🧹 Cleaning up test artifacts..."

    # Clean backend
    if [ -d "server/coverage" ]; then
        rm -rf server/coverage
    fi

    # Clean frontend
    if [ -d "client/coverage" ]; then
        rm -rf client/coverage
    fi

    print_status "✅ Cleanup completed"
}

# Main function
main() {
    echo "🚀 HR System Test Runner"
    echo "========================"

    # Parse command line arguments
    SKIP_MONGO_CHECK=false
    RUN_COVERAGE=false
    RUN_AUDIT=false
    CLEANUP_AFTER=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-mongo)
                SKIP_MONGO_CHECK=true
                shift
                ;;
            --coverage)
                RUN_COVERAGE=true
                shift
                ;;
            --audit)
                RUN_AUDIT=true
                shift
                ;;
            --cleanup)
                CLEANUP_AFTER=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --skip-mongo   Skip MongoDB connection check"
                echo "  --coverage     Generate coverage reports"
                echo "  --audit        Run security audit"
                echo "  --cleanup      Clean up test artifacts after running"
                echo "  --help         Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # Check MongoDB if not skipped
    if [ "$SKIP_MONGO_CHECK" = false ]; then
        if ! check_mongodb; then
            exit 1
        fi
    fi

    # Track overall success
    OVERALL_SUCCESS=true

    # Run backend tests
    if ! run_backend_tests; then
        print_error "❌ Backend tests failed"
        OVERALL_SUCCESS=false
    else
        print_status "✅ Backend tests passed"
    fi

    echo ""

    # Run frontend tests
    if ! run_frontend_tests; then
        print_error "❌ Frontend tests failed"
        OVERALL_SUCCESS=false
    else
        print_status "✅ Frontend tests passed"
    fi

    echo ""

    # Generate coverage if requested
    if [ "$RUN_COVERAGE" = true ]; then
        generate_coverage
        echo ""
    fi

    # Run security audit if requested
    if [ "$RUN_AUDIT" = true ]; then
        run_security_audit
        echo ""
    fi

    # Clean up if requested
    if [ "$CLEANUP_AFTER" = true ]; then
        cleanup
        echo ""
    fi

    # Final status
    echo "🏁 Test Results Summary"
    echo "====================="

    if [ "$OVERALL_SUCCESS" = true ]; then
        print_status "✅ All tests passed successfully!"

        if [ "$RUN_COVERAGE" = true ]; then
            echo ""
            print_status "📊 Coverage reports:"
            print_status "   Backend:  server/coverage/index.html"
            print_status "   Frontend: client/coverage/index.html"
        fi

        echo ""
        print_status "🚀 System is ready for deployment!"
        exit 0
    else
        print_error "❌ Some tests failed. Please check the output above."
        exit 1
    fi
}

# Run main function with all arguments
main "$@"